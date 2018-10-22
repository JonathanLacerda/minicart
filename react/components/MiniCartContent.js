import React, { Component, Fragment } from 'react'
import PropTypes from 'prop-types'
import { injectIntl, intlShape } from 'react-intl'
import { reduceBy, values } from 'ramda'
import classNames from 'classnames'

import { ExtensionPoint } from 'render'

import { Button, Spinner, IconDelete } from 'vtex.styleguide'
import ProductPrice from 'vtex.store-components/ProductPrice'

import { MiniCartPropTypes } from '../propTypes'

/**
 * Minicart content component
 */
class MiniCartContent extends Component {
  static propTypes = {
    /* Set the mini cart content size */
    large: PropTypes.bool,
    /* Internationalization */
    intl: intlShape.isRequired,
    /** Define a function that is executed when the item is clicked */
    actionOnClick: PropTypes.func,
    /* Reused props */
    data: MiniCartPropTypes.orderFormContext,
    labelMiniCartEmpty: MiniCartPropTypes.labelMiniCartEmpty,
    labelButton: MiniCartPropTypes.labelButtonFinishShopping,
    showRemoveButton: MiniCartPropTypes.showRemoveButton,
    showSku: MiniCartPropTypes.showSku,
    enableQuantitySelector: MiniCartPropTypes.enableQuantitySelector,
    maxQuantity: MiniCartPropTypes.maxQuantity,
    showDiscount: MiniCartPropTypes.showDiscount,
  }

  state = { showSpinner: false }

  sumItemsPrice = items => {
    let sum = 0
    items.forEach(item => {
      sum += item.listPrice * item.quantity
    })
    return sum
  }

  getGroupedItems = () =>
    values(
      reduceBy(
        (acc, item) =>
          acc ? { ...acc, quantity: acc.quantity + item.quantity } : item,
        undefined,
        item => item.id,
        this.props.data.orderForm.items
      )
    )

  calculateDiscount = (items, totalPrice) =>
    this.sumItemsPrice(items) - totalPrice

  handleClickButton = () => location.assign('/checkout/#/cart')

  onRemoveItem = id => {
    this.setState({ showSpinner: true })

    const {
      data: { orderForm, updateAndRefetchOrderForm },
    } = this.props
    const itemPayload = orderForm.items.find(item => item.id === id)
    const index = orderForm.items.indexOf(itemPayload)
    const updatedItem = [itemPayload].map(item => {
      return {
        id: parseInt(item.id),
        index: index,
        quantity: 0,
        seller: 1,
      }
    })

    updateAndRefetchOrderForm({
      variables: {
        orderFormId: orderForm.orderFormId,
        items: updatedItem,
      },
    })
  }

  onUpdateItems = (id, quantity) => {
    this.setState({ showSpinner: true })
    const {
      data: {
        orderForm,
        updateAndRefetchOrderForm,
      },
    } = this.props
    const items = this.getGroupedItems()
    const itemPayloadGrouped = items.find(item => item.id === id)
    const itemsPayload = orderForm.items.filter(item => item.id === id)
    let itemPayload = itemsPayload[0]
    const index = orderForm.items.indexOf(itemsPayload[0])
    const newQuantity = quantity - (itemPayloadGrouped.quantity - itemPayload.quantity)
    const updatedItems = [
      {
        id: itemPayload.id,
        index,
        quantity: newQuantity,
      },
    ]

    if (newQuantity <= 0) {
      updatedItems[0].quantity = 0
      itemPayload = itemsPayload[1]
      updatedItems.push(
        {
          id: itemPayload.id,
          index: orderForm.items.indexOf(itemPayload),
          quantity: itemPayload.quantity + newQuantity,
        }
      )
    }

    updateAndRefetchOrderForm({
      variables: {
        orderFormId: orderForm.orderFormId,
        items: updatedItems,
      },
    }).then(() => {
      this.setState({ showSpinner: false })
    })
  }

  renderWithoutItems = label => (
    <div className="vtex-minicart__item pa9 flex items-center justify-center relative bg-white">
      <span className="f5">{label}</span>
    </div>
  )

  createProductShapeFromItem = item => {

    return {
      productName: item.name,
      linkText: item.detailUrl.replace(/^\//, '').replace(/\/p$/, ''),
      sku: {
        seller: {
          commertialOffer: {
            Price: item.sellingPrice,
            ListPrice: item.ListPrice
          }
        },
        name: item.skuName,
        itemId: item.id,
        image: {
          imageUrl: item.imageUrl
        },
      },
    }
  }

  renderDeleteButton = id => {
    return (
      <div className="pa0-m">
        <Button icon variation="tertiary" onClick={e => this.onRemoveItem(id, e)}>
          <IconDelete size={15} color="#BDBDBD" />
        </Button>
      </div>
    )
  }

  renderMiniCartWithItems = (
    orderForm,
    label,
    labelDiscount,
    showRemoveButton,
    showDiscount,
    showSku,
    enableQuantitySelector,
    maxQuantity,
    actionOnClick,
    showSpinner,
    large
  ) => {
    const items = this.getGroupedItems()

    const classes = classNames(
      'vtex-minicart__content overflow-x-hidden pa1',
      {
        'vtex-minicart__content--small bg-white': !large,
        'overflow-y-auto': large,
        'overflow-y-scroll': items.length > 3 && !large,
        'overflow-y-hidden': items.length <= 3 && !large,
      }
    )

    const discount = this.calculateDiscount(items, orderForm.value)
    const { onClickProduct } = this.props
    const deleteButton = <Fragment>
      <div className="ma0 pa0 ph0"><Button icon variation="tertiary">
        <IconDelete className="ma0 pa0 ph8" size={20} color="#BDBDBD" />
      </Button></div>

    </Fragment>

    return (
      <Fragment>
        <div className={classes}>
          {items.map(item => (

            <Fragment>
              <ExtensionPoint id="product-summary"
                key={item.id}
                product={this.createProductShapeFromItem(item)}
                name={item.name}
                displayMode="inline"
                showListPrice={false}
                showBadge={false}
                showBorders={true}
                showInstallments={false}
                showLabels={false}
                deleteButton={this.renderDeleteButton(item.id)}
                actionOnClick={actionOnClick}
              />
            </Fragment>
          ))}
        </div>
        <div
          className="vtex-minicart-content__footer w-100 bg-white pa4 bt b--silver pt4 flex flex-column items-end">
          {showDiscount && (
            <div className="vtex-minicart__content-discount blue w-100 flex justify-end items-center">
              <span className="ttl c-action-primary">{labelDiscount}</span>
              <ProductPrice
                sellingPrice={discount}
                listPrice={discount}
                showLabels={false}
                showListPrice={false}
              />
            </div>
          )}
          <div className="vtex-minicart__content-price mb3">
            {showSpinner && <Spinner size={18} />}
            <ProductPrice
              sellingPrice={orderForm.value}
              listPrice={orderForm.value}
              showLabels={false}
              showListPrice={false}
            />
          </div>
          <Button
            variation="primary"
            size="small"
            onClick={this.handleClickButton}
          >
            {label}
          </Button>
        </div>
      </Fragment>
    )
  }

  renderLoading = () => (
    <div className="vtex-minicart__item pa4 flex items-center justify-center relative bg-white">
      <Spinner />
    </div>
  )

  render() {
    const {
      data,
      labelMiniCartEmpty,
      labelButton,
      intl,
      showRemoveButton,
      showDiscount,
      showSku,
      enableQuantitySelector,
      actionOnClick,
      maxQuantity,
      large,
    } = this.props
    const { showSpinner } = this.state

    if (!data || data.loading) {
      return this.renderLoading()
    }

    if (!data.orderForm || !data.orderForm.items.length) {
      const label =
        labelMiniCartEmpty || intl.formatMessage({ id: 'minicart-empty' })
      return this.renderWithoutItems(label)
    }

    const label =
      labelButton || intl.formatMessage({ id: 'finish-shopping-button-label' })
    const labelDiscount = intl.formatMessage({
      id: 'minicart-content-footer-discount',
    })

    return this.renderMiniCartWithItems(
      data.orderForm,
      label,
      labelDiscount,
      showRemoveButton,
      showDiscount,
      showSku,
      enableQuantitySelector,
      maxQuantity,
      actionOnClick,
      showSpinner,
      large
    )
  }
}

export default injectIntl(MiniCartContent)
